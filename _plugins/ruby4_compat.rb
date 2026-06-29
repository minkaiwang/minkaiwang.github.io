# Compatibility shim for Jekyll/Liquid when running on Ruby 4.
class Object
  def tainted?
    false
  end
end
