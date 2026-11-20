require 'yaml'
require 'json'
config=YAML.load_file('.pages.yml', aliases: true)
collections=config.fetch('content')
raise 'missing collections' unless %w[homepage products pages posts settings].all?{|n| collections.any?{|e|e['name']==n}}
raise 'merge mode disabled' unless config.dig('settings','content','merge')==true
lists=0
walk=lambda do |fields,location|
  (fields||[]).each do |f|
    next unless f.is_a?(Hash)
    if f['type']=='object' && f['list']
      lists+=1
      list=f['list']
      summary=list.is_a?(Hash) ? list.dig('collapsible','summary') : nil
      raise "Unlabeled expandable list: #{location}.#{f['name']}" unless summary.is_a?(String) && summary.include?('{')
    end
    walk.call(f['fields'],location+'.'+f['name'].to_s) if f['fields']
  end
end
collections.each{|c|walk.call(c['fields'],c['name'])}
raise 'No structured lists found' if lists<10

paths=['content/homepage.json']+Dir['content/products/*.json','content/pages/*.json'].sort
raise "Expected 72 existing pages; got #{paths.size}" unless paths.size==72
counts=Hash.new(0)
paths.each do |file|
  page=JSON.parse(File.read(file))
  groups=(page['contentGroups']||[])+(page['outsideGroups']||[])
  groups.each do |g|
    next if !g['headingSource'] && (g['items']||[]).empty?
    # Each collapsed row needs meaningful visible words and non-empty editable values.
    raise "Empty section group: #{file}" if g['heading'].to_s.strip.empty? && (g['items']||[]).empty?
    (g['items']||[]).each do |item|
      raise "Empty text field: #{file}" if item['text'].to_s.strip.empty?
      raise "Broken source mapping: #{file}" if item['source'].to_s.empty?
      counts['content']+=1
    end
  end
  {'buttons'=>'text','cardLinks'=>'label','priceValues'=>'value','labelTexts'=>'text'}.each do |list,key|
    (page[list]||[]).each do |record|
      raise "Empty #{list} field: #{file}" if record[key].to_s.strip.empty?
      counts[list]+=1
    end
  end
  if file.start_with?('content/products/')
    hero=page.fetch('productHero')
    %w[name description price image buttonLabel buttonUrl].each do |field|
      raise "Empty product #{field} on #{file}" if hero[field].to_s.strip.empty?
    end
    counts['products']+=1
  end
end
puts "Populated Pages CMS: #{paths.size} original pages, #{lists} labeled list editors, #{counts.inspect}."
